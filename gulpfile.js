const gulp = require("gulp");
const download = require("gulp-download2");
const cp = require("child_process");

const groupId = "io.openliberty.tools";
const version = "1.0-SNAPSHOT";
var releaseLevel = "snapshots"; //snapshots or releases

const libertyLemminxName = "liberty-langserver-lemminx-" + version + "-jar-with-dependencies.jar";
const libertyLemminxDir = "../liberty-language-server/lemminx-liberty";
const libertyLSName = "liberty-langserver-" + version + "-jar-with-dependencies.jar";
const libertyLSDir = "../liberty-language-server/liberty-ls"

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

//https://oss.sonatype.org/service/local/artifact/maven/content?r=snapshots&g=io.openliberty.tools&a=liberty-langserver-lemminx&c=jar-with-dependencies&v=1.0-SNAPSHOT
//https://oss.sonatype.org/service/local/artifact/maven/content?r=snapshots&g=io.openliberty.tools&a=liberty-langserver&c=jar-with-dependencies&v=1.0-SNAPSHOT
const sonatypeURL = "https://oss.sonatype.org/service/local/artifact/maven/content";
const releaseLevelString = "?r=" + releaseLevel;
const groupIdString = "&g=" + groupId;
const versionString = "&v=" + version;
const classifierString = "&c=jar-with-dependencies";

const libertyLemminxURL = sonatypeURL + releaseLevelString + groupIdString + "&a=liberty-langserver-lemminx" + classifierString + versionString;
const libertyLSURL = sonatypeURL + releaseLevelString + groupIdString + "&a=liberty-langserver" + classifierString + versionString;

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

function mvnw() {
  return isWin() ? "mvnw.cmd" : "./mvnw";
}

function isWin() {
  return /^win/.test(process.platform);
}
