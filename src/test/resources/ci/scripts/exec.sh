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

# Boolean to see if any failure has occured while executing commands
failure="false"

main() {

    setVscodeVersionToTest
    chmod -R 777 src/test/resources/maven
    chmod -R 777 src/test/resources/gradle
    if [ $TYPE == "BUILD" ]; then
        echo -e "\n> $(${currentTime[@]}): Build: Building the plugin"

        # Build VSE package
        npm install
        npm install -g vsce
        npm run build
        npm run compile
        vsce package
        updateExitStatus
    else

        #Initialisation step
        npm run test-compile
        cd src/test/resources/maven/liberty.maven.test.wrapper.app
        mvn liberty:start
        mvn liberty:stop


        #Docker test initialisation step
        if [ $OS = "Linux" ]; then
                #Start Display and Docker-Daemon
                startDisplayAndDocker

                mvn package
                docker build --pull -f ./Dockerfile -t inventory-dev-mode .
	fi

        cd -

        if [ $VSCODE_VERSION_TO_RUN == "latest" ]; then
            # Run the plugin's install goal against the latest vscode version
             if [ $OS = "Darwin" ]; then
                chown -R runner src/test/resources/maven
              chown -R runner  src/test/resources/gradle
                # Gradle tests should be run before Maven tests because the after hook for copying the screeshots from temporary to a  permananet location is written in the Maven tests so that the copying will be done at the end of every test cases.
                npm run test-mac-gradle -- -u
                updateExitStatus
                npm run test-mac-maven -- -u
                updateExitStatus
            else
                npm run test -- -u
                updateExitStatus
            fi
        else
            # Run the plugin's install goal against the target vscode version
            if [ $OS = "Darwin" ]; then
              chown -R runner src/test/resources/maven
              chown -R runner  src/test/resources/gradle
              # Gradle tests should be run before Maven tests because the after hook for copying the screeshots from temporary to a  permananet location is written in the Maven tests so that the copying will be done at the end of every test cases.
              npm run test-mac-gradle -- -u -c $VSCODE_VERSION_TO_RUN
              updateExitStatus
              npm run test-mac-maven -- -u -c $VSCODE_VERSION_TO_RUN
              updateExitStatus
            else
            npm run test -- -u -c $VSCODE_VERSION_TO_RUN
            updateExitStatus
            fi
        fi
    fi

    # If there were any errors, gather some debug data before exiting.
    if [ "$failure" = "true" ]; then
        echo "ERROR: Failure occurred while running the tests."

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
    fi
}

#find current vscode version
setVscodeVersionToTest() {
        latest_version=$(curl -s https://code.visualstudio.com/updates)
        current_version=$(echo $latest_version | cut -d"v" -f2 | sed 's/_/./g')

        if echo "$current_version" | grep -qE '^[1-9]+\.[0-9]+$'; then
                echo "The string is a version string."
                previous_version=$(awk -F. '{print $1"."$2-1}' <<<$current_version)
                previousMinusOne=$(awk -F. '{print $1"."$2-2}' <<<$current_version)
                echo $current_version $previous_version $previousMinusOne
        else
                echo "The string is not a version string."
                current_version='latest'
                previous_version='latest'
                previousMinusOne='latest'
        fi

        if [[ $VSCODE_VERSION_TO_RUN = 'latest' ]]; then
                VSCODE_VERSION_TO_RUN='latest'
        elif [[ $VSCODE_VERSION_TO_RUN = 'previous' ]]; then
                VSCODE_VERSION_TO_RUN="$previous_version.0"
        else
                VSCODE_VERSION_TO_RUN="$previousMinusOne.0"
        fi
}

# Finding the exit status of a command and updating failure boolean.
# Need to call this method after executing each npm command to store the status.
updateExitStatus() {
    status=$?
    if [ "$failure" = "false" ] && [ $status -ne 0 ]; then
        failure="true"
    fi
}

main "$@"
