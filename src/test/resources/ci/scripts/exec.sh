#!/bin/bash

############################################################################
# Copyright (c) 2022 IBM Corporation and others.
# 
# This program and the accompanying materials are made available under the
# terms of the Eclipse Public License v. 2.0 which is available at
# http://www.eclipse.org/legal/epl-2.0.
# 
# SPDX-License-Identifier: EPL-2.0
# 
# Contributors:
#     IBM Corporation - initial implementation
############################################################################
set -Ex

#BUILD OR TEST TO EXECUTE
TYPE=$1

#IF TEST TTYPE HEN RUN WITH VERSION OF VSCODE TO RUN TESTS 1.74.0, LATEST
VSCODE_VERSION_TO_RUN=$2

# Current time.
currentTime=(date +"%Y/%m/%d-%H:%M:%S:%3N")

# Operating system.
OS=$(uname -s)

main() {

    if [ $TYPE == "BUILD" ]; then
        echo -e "\n> $(${currentTime[@]}): Build: Building the plugin"

        # Build VSE package
        npm install
        npm install -g vsce
        npm run build
        npm run compile
        vsce package
    else

        #Start Display and Docker-Daemon
        startDisplayAndDocker

        #Initialisation step
        npm run test-compile
        cd src/test/resources/maven/liberty.maven.test.wrapper.app
        mvn liberty:start
        mvn liberty:stop

        #Docker test initialisation step
        mvn package
        docker build --pull -f ./Dockerfile -t inventory-dev-mode .

        cd -

        if [ $VSCODE_VERSION_TO_RUN == "latest" ]; then
            # Run the plugin's install goal against the latest vscode version
            npm run test -- -u
        else
            # Run the plugin's install goal against the target vscode version
            npm run test -- -u -c $VSCODE_VERSION_TO_RUN
        fi
    fi

    # If there were any errors, gather some debug data before exiting.
    rc=$?
    if [ "$rc" -ne 0 ]; then
        echo "ERROR: Failure while driving npm install on plugin. rc: ${rc}."

        if [ $TYPE = "TEST" ]; then
            echo "DEBUG: Maven Liberty messages.log:\n"
            cat src/test/resources/maven/liberty.maven.test.wrapper.app/target/liberty/wlp/usr/servers/defaultServer/logs/messages.log

            echo "DEBUG: Gradle Liberty messages.log:\n"
            cat src/test/resources/gradle/liberty.gradle.test.wrapper.app/build/wlp/usr/servers/defaultServer/logs/messages.log
        fi

        echo "DEBUG: Environment variables:\n"
        env

        exit -1
    fi
}

#start docker and display
startDisplayAndDocker() {
    # Tell the terminal session to use display port 88.
    export DISPLAY=:88.0

    # Install software.
    if [ $OS = "Linux" ]; then
        # Start the X display server on port 88.
        Xvfb -ac :88 -screen 0 1280x1024x16 > /dev/null 2>&1 &

        #  Start the window manager.
        metacity --sm-disable --replace 2> metacity.err &

        #start docker deamon
        sudo service docker start &
        sleep 30
        docker ps
    elif [[ $OS == "Darwin" ]]; then
        docker ps
    else
        sudo dockerd
        sleep 30
        docker ps
    fi
}


main "$@"
