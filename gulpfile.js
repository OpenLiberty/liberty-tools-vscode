const axios = require("axios");
const gulp = require("gulp");
const download = require("gulp-download2");
const cp = require("child_process");
const { XMLParser } = require('fast-xml-parser');

const fs = require('fs');
const path = require('path');

const { finished } = require('stream');
const { promisify } = require('util');
const finishedAsync = promisify(finished);

const MC_BASE_URL = "https://repo1.maven.org/maven2";
const MC_SNAPSHOT_BASE_URL = "https://central.sonatype.com/repository/maven-snapshots";

const libertyGroupId = "io.openliberty.tools";
const libertyLemminxArtifactId = "liberty-langserver-lemminx";
const libertyLSArtifactId = "liberty-langserver";
const libertyVersion = "2.3.2";
const jakartaGroupId = "org.eclipse.lsp4jakarta";
const jakartaVersion = "0.2.3";
var lclsReleaseLevel = "releases";  //snapshots or releases
var jakartaReleaseLevel = "releases";

const libertyLemminxName = "liberty-langserver-lemminx-" + libertyVersion + "-jar-with-dependencies.jar";
const libertyLemminxDir = "../liberty-language-server/lemminx-liberty";
const libertyLSName = "liberty-langserver-" + libertyVersion + "-jar-with-dependencies.jar";
const libertyLSDir = "../liberty-language-server/liberty-ls";
const jakartaJdtName = "org.eclipse.lsp4jakarta.jdt.core-" + jakartaVersion + ".jar";
const jakartaJdtDir = "../lsp4jakarta/jakarta.jdt/org.eclipse.lsp4jakarta.jdt.core";
const jakartaLSName = "org.eclipse.lsp4jakarta.ls-" + jakartaVersion + "-jar-with-dependencies.jar";
const jakartaLSDir = "../lsp4jakarta/jakarta.ls";

gulp.task("buildLemminxLiberty", (done) => {
  cp.execSync(mvnw() + " clean install -DskipTests -Dinvoker.skip=true", {
    cwd: libertyLemminxDir,
    stdio: "inherit",
  });
  gulp.src(libertyLemminxDir + "/target/" + libertyLemminxName, { encoding: false }).pipe(gulp.dest("./jars"));
  done();
});

gulp.task("buildLibertyServer", (done) => {
  cp.execSync(mvnw() + " clean install -DskipTests", {
    cwd: libertyLSDir,
    stdio: "inherit",
  });
  gulp.src(libertyLSDir + "/target/" + libertyLSName, { encoding: false }).pipe(gulp.dest("./jars"));
  done();
});

gulp.task("buildJakartaJdt", (done) => {
  cp.execSync("mvn clean install", {
    cwd: jakartaJdtDir,
    stdio: "inherit",
  });
  gulp.src(jakartaJdtDir + "/target/" + jakartaJdtName, { encoding: false }).pipe(gulp.dest("./jars"));
  done();
});

gulp.task("buildJakartaLs", (done) => {
  cp.execSync("mvn clean install", {
    cwd: jakartaLSDir,
    stdio: "inherit",
  });
  gulp.src(jakartaLSDir + "/target/" + jakartaLSName, { encoding: false }).pipe(gulp.dest("./jars"));
  done();
});

gulp.task("downloadLibertyLSJars", async function() {
  var libertyLemminxURL;
  var libertyLSURL;

  if (lclsReleaseLevel === "snapshots") {
    libertyLemminxURL = await generateSnapshotJarURL(libertyGroupId, libertyLemminxArtifactId, libertyVersion, "jar-with-dependencies");
    libertyLSURL = await generateSnapshotJarURL(libertyGroupId, libertyLSArtifactId, libertyVersion, "jar-with-dependencies");
  } else {
    libertyLemminxURL = getMavenCentralJarURL(libertyGroupId, libertyLemminxArtifactId, libertyVersion, "jar-with-dependencies");
    libertyLSURL = getMavenCentralJarURL(libertyGroupId, libertyLSArtifactId, libertyVersion, "jar-with-dependencies");
  }

  await Promise.all([
    downloadJar(libertyLemminxURL, libertyLemminxName, "./jars"),
    downloadJar(libertyLSURL, libertyLSName, "./jars")
  ]);
});

//https://repo.eclipse.org/service/local/artifact/maven/content?r=snapshots&g=org.eclipse.lsp4jakarta&a=org.eclipse.lsp4jakarta.jdt.core&v=0.0.1-SNAPSHOT
//https://repo.eclipse.org/service/local/artifact/maven/content?r=snapshots&g=org.eclipse.lsp4jakarta&a=org.eclipse.lsp4jakarta.ls&c=jar-with-dependencies&v=0.0.1-SNAPSHOT
const eclipseRepoURL = "https://repo.eclipse.org/service/local/artifact/maven/content";
const jakartaReleaseLevelString = "?r=" + jakartaReleaseLevel;
const jakartaGroupIdString = "&g=" + jakartaGroupId;
const jakartaVersionString = "&v=" + jakartaVersion;
const jakartaClassifierString = "&c=jar-with-dependencies";

const jakartaJDTURL = eclipseRepoURL + jakartaReleaseLevelString + jakartaGroupIdString + "&a=org.eclipse.lsp4jakarta.jdt.core" + jakartaVersionString;
const jakartaLSURL = eclipseRepoURL + jakartaReleaseLevelString + jakartaGroupIdString + "&a=org.eclipse.lsp4jakarta.ls" + jakartaClassifierString + jakartaVersionString;

gulp.task("downloadLSP4JakartaJars", (done) => {
  download({
      url: jakartaJDTURL,
      file: jakartaJdtName,
    })
    .pipe(gulp.dest("./jars", { encoding: false}));
  download({
      url: jakartaLSURL,
      file: jakartaLSName,
    })
    .pipe(gulp.dest("./jars", { encoding: false}));
  done();
});

function mvnw() {
  return isWin() ? "mvnw.cmd" : "./mvnw";
}

function isWin() {
  return /^win/.test(process.platform);
}

// Handle jar download through axios, gulp download failed with 403 on Maven Central snapshot repo
async function downloadJar(url, fileName, destDir) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Node.js downloader)',
      'Accept': `*/*`
    },
    responseType: 'stream'
  });

  console.log(`Downloading ${url}`);
  const fullPath = path.join(destDir, fileName);
  const writer = fs.createWriteStream(fullPath);
  response.data.pipe(writer);
  await finishedAsync(writer);
  console.log(`Downloaded ${fileName}`);
}

// Generate Maven Central artifact URL for specified GAV coordinates
// Example: https://repo1.maven.org/maven2/io/openliberty/tools/liberty-langserver/2.3.1/liberty-langserver-2.3.1-jar-with-dependencies.jar
function getMavenCentralJarURL (groupId, artifactId, version, classifier) {
  const classifierString = classifier ? `-${classifier}` : '';
  const mavenCentralJarURL = `${MC_BASE_URL}/${groupId.replace(/\./g, '/')}/${artifactId}/${version}/${artifactId}-${version}${classifierString}.jar`;
  return mavenCentralJarURL;
}

// No API provided to retrieve snapshot artifacts hosted on https://central.sonatype.com/repository/maven-snapshots
// Can access maven-metadata.xml using GAV coordinates for artifacts
// Will parse retrieved maven-metadata.xml for full artifact version, including timestamp
// Example: https://central.sonatype.com/repository/maven-snapshots/io/openliberty/tools/liberty-langserver/2.3.1-SNAPSHOT/maven-metadata.xml -> 2.3.1-20250714.163135-2
async function resolveSnapshotVersionFromMetadata (groupId, artifactId, snapshotVersion, classifier) {
  // Generate maven-metadata.xml URL
  const metadataURL = `${MC_SNAPSHOT_BASE_URL}/${groupId.replace(/\./g, '/')}/${artifactId}/${snapshotVersion}/maven-metadata.xml`;
  console.log(`Fetching maven-metadata.xml: ${metadataURL}`);

  // Fetch and parse maven-metadata.xml
  const response = await axios.get(metadataURL);
  // console.log(response.data);
  const parser = new XMLParser();
  const parsedXML = parser.parse(response.data);

  // Get all <snapshotVersion> entries
  const versions = parsedXML?.metadata?.versioning?.snapshotVersions.snapshotVersion || [];

  const targetClassifier = classifier || null;

  // Filter entries, only list jar files, match classifier if provided
  const snapshotVersionEntry = versions.find(v => {
    const extensionMatch = v.extension === 'jar';
    const classifierValue = v.classifier || null;

    return extensionMatch && classifierValue === targetClassifier;
  });

  if (!snapshotVersionEntry) {
    throw new Error(`No snapshot JAR found matching parameters: ${groupId}:${artifactId}:${classifier || '(no classifier)'}:${snapshotVersion}`);
  }

  console.log(`Resolved full snapshot version for ${artifactId}: ${snapshotVersionEntry.value}`);
  return snapshotVersionEntry.value;
}

// Generate Maven Central artifact URL for a SNAPSHOT dependency with provided GAV coordinates
// LCLS 2.3.1-SNAPSHOT jar-with-dependencies: <MC_SNAPSHOT_BASE_URL>/io/openliberty/tools/liberty-langserver/2.3.1-SNAPSHOT/liberty-langserver-2.3.1-20250714.163135-2-jar-with-dependencies.jar
async function generateSnapshotJarURL (groupId, artifactId, snapshotVersion, classifier) {
  const snapshotJarVersion = await resolveSnapshotVersionFromMetadata(groupId, artifactId, snapshotVersion, classifier);
  const classifierString = classifier ? `-${classifier}` : ''; //Format classifier for URL if defined
  const snapshotJarURL = `${MC_SNAPSHOT_BASE_URL}/${groupId.replace(/\./g, '/')}/${artifactId}/${snapshotVersion}/${artifactId}-${snapshotJarVersion}${classifierString}.jar`;
  console.log(`${groupId}:${artifactId}:${snapshotVersion}:${classifier} URL: ${snapshotJarURL}`);
  return snapshotJarURL;
}