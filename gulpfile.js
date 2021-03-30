const gulp = require("gulp");
const cp = require("child_process");

const libertyLemminxName = "lemminx-liberty-1.0-SNAPSHOT-jar-with-dependencies.jar";
const libertyLemminxDir = "../liberty-language-server/lemminx-liberty";
const libertyLSName = "liberty.ls-1.0-SNAPSHOT-jar-with-dependencies.jar";
const libertyLSDir = "../liberty-language-server/liberty-ls"

gulp.task("buildLemminxLiberty", (done) => {
  cp.execSync(mvnw() + " clean install -DskipTests", {
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


function mvnw() {
  return isWin() ? "mvnw.cmd" : "./mvnw";
}

function isWin() {
  return /^win/.test(process.platform);
}
