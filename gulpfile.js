const gulp = require("gulp");
const download = require("gulp-download2");
const cp = require("child_process");

const libertyGroupId = "io.openliberty.tools";
const libertyVersion = "2.2";
const jakartaGroupId = "org.eclipse.lsp4jakarta";
const jakartaVersion = "0.2.1";
var releaseLevel = "releases";  //"snapshots"; //snapshots or releases

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
  gulp.src(libertyLemminxDir + "/target/" + libertyLemminxName).pipe(gulp.dest("./jars"));
  done();
});

gulp.task("buildLibertyServer", (done) => {
  cp.execSync(mvnw() + " clean install -DskipTests", {
    cwd: libertyLSDir,
    stdio: "inherit",
  });
  gulp.src(libertyLSDir + "/target/" + libertyLSName).pipe(gulp.dest("./jars"));
  done();
});

gulp.task("buildJakartaJdt", (done) => {
  cp.execSync("mvn clean install", {
    cwd: jakartaJdtDir,
    stdio: "inherit",
  });
  gulp.src(jakartaJdtDir + "/target/" + jakartaJdtName).pipe(gulp.dest("./jars"));
  done();
});

gulp.task("buildJakartaLs", (done) => {
  cp.execSync("mvn clean install", {
    cwd: jakartaLSDir,
    stdio: "inherit",
  });
  gulp.src(jakartaLSDir + "/target/" + jakartaLSName).pipe(gulp.dest("./jars"));
  done();
});

//https://oss.sonatype.org/service/local/artifact/maven/content?r=snapshots&g=io.openliberty.tools&a=liberty-langserver-lemminx&c=jar-with-dependencies&v=1.0-SNAPSHOT
//https://oss.sonatype.org/service/local/artifact/maven/content?r=snapshots&g=io.openliberty.tools&a=liberty-langserver&c=jar-with-dependencies&v=1.0-SNAPSHOT
const sonatypeURL = "https://oss.sonatype.org/service/local/artifact/maven/content";
const releaseLevelString = "?r=" + releaseLevel;
const libertyGroupIdString = "&g=" + libertyGroupId;
const libertyVersionString = "&v=" + libertyVersion;
const classifierString = "&c=jar-with-dependencies";

const libertyLemminxURL = sonatypeURL + releaseLevelString + libertyGroupIdString + "&a=liberty-langserver-lemminx" + classifierString + libertyVersionString;
const libertyLSURL = sonatypeURL + releaseLevelString + libertyGroupIdString + "&a=liberty-langserver" + classifierString + libertyVersionString;

gulp.task("downloadLibertyLSJars", (done) => {
  download({
      url: libertyLemminxURL,
      file: libertyLemminxName,
    })
    .pipe(gulp.dest("./jars"));
    download({
      url: libertyLSURL,
      file: libertyLSName,
    })
    .pipe(gulp.dest("./jars"));
  done();
});

//https://repo.eclipse.org/service/local/artifact/maven/content?r=snapshots&g=org.eclipse.lsp4jakarta&a=org.eclipse.lsp4jakarta.jdt.core&v=0.0.1-SNAPSHOT
//https://repo.eclipse.org/service/local/artifact/maven/content?r=snapshots&g=org.eclipse.lsp4jakarta&a=org.eclipse.lsp4jakarta.ls&c=jar-with-dependencies&v=0.0.1-SNAPSHOT
const eclipseRepoURL = "https://repo.eclipse.org/service/local/artifact/maven/content";
const jakartaReleaseLevelString = "?r=" + releaseLevel;
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
    .pipe(gulp.dest("./jars"));
    download({
      url: jakartaLSURL,
      file: jakartaLSName,
    })
    .pipe(gulp.dest("./jars"));
  done();
});

function mvnw() {
  return isWin() ? "mvnw.cmd" : "./mvnw";
}

function isWin() {
  return /^win/.test(process.platform);
}
