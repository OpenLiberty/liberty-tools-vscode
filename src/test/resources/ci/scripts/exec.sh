#!/bin/bash

############################################################################
# Copyright (c) 2022, 2026 IBM Corporation and others.
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

#Execute BUILD or TEST
TYPE=$1

#Run with previous or latest version of VSCODE
VSCODE_VERSION_TO_RUN=$2

#Build tool to test (maven or gradle)
BUILD_TOOL=${3:-gradle}

# Pinned version of redhat.java that is compatible with Liberty Tools (lsp4jakarta)
REDHAT_JAVA_VERSION="1.54.0"

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
        installPinnedRedhatJava
        
        # Initialize Maven project if needed
        if [ "$BUILD_TOOL" = "maven" ]; then
            cd src/test/resources/maven/liberty-maven-test-wrapper-app
            mvn liberty:start
            mvn liberty:stop

            #Docker test initialisation step for Maven
            if [ $OS = "Linux" ]; then
                mvn package
                docker build --pull -f ./Dockerfile -t inventory-dev-mode .
            fi
            cd -
        fi

         #Start Display and Docker-Daemon
        if [ $OS = "Linux" ]; then
            startDisplayAndDocker
        fi

        # Run Tests
        if [ $OS = "Darwin" ]; then
            if [ "$BUILD_TOOL" = "maven" ]; then
                chown -R runner src/test/resources/maven
            fi
            if [ "$BUILD_TOOL" = "gradle" ]; then
                chown -R runner src/test/resources/gradle
            fi
        fi

        if [ $VSCODE_VERSION_TO_RUN == "latest" ]; then
            if [ "$BUILD_TOOL" = "gradle" ]; then
                npm run test-gradle -- -u
            elif [ "$BUILD_TOOL" = "maven" ]; then
                npm run test-maven -- -u
            fi
        else
            if [ "$BUILD_TOOL" = "gradle" ]; then
                npm run test-gradle -- -u -c $VSCODE_VERSION_TO_RUN
            elif [ "$BUILD_TOOL" = "maven" ]; then
                npm run test-maven -- -u -c $VSCODE_VERSION_TO_RUN
            fi
        fi
        updateExitStatus
    fi

    # If there were any errors, gather some debug data before exiting.
    if [ "$failure" = "true" ]; then
        echo "ERROR: Failure occurred while running ${TYPE} step."

        if [ $TYPE = "TEST" ]; then
            echo "DEBUG: Maven Liberty messages.log:\n"
            cat src/test/resources/maven/liberty-maven-test-wrapper-app/target/liberty/wlp/usr/servers/defaultServer/logs/messages.log

            echo "DEBUG: Gradle Liberty messages.log:\n"
            cat src/test/resources/gradle/liberty-gradle-test-wrapper-app/build/wlp/usr/servers/defaultServer/logs/messages.log
        fi

        echo "DEBUG: Environment variables:\n"
        env

        exit -1
    fi
}

# Download and install a pinned version of redhat.java from Open VSX to avoid
# pulling 1.55.0+ which is incompatible with lsp4jakarta used by Liberty Tools.
installPinnedRedhatJava() {
    local vsix_url="https://open-vsx.org/api/redhat/java/${REDHAT_JAVA_VERSION}/file/redhat.java-${REDHAT_JAVA_VERSION}.vsix"
    local vsix_file="/tmp/redhat.java-${REDHAT_JAVA_VERSION}.vsix"
    echo "> $(${currentTime[@]}): Installing pinned redhat.java v${REDHAT_JAVA_VERSION} from Open VSX"
    curl -fL "$vsix_url" -o "$vsix_file"
    npx extest install-vsix "$vsix_file"
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
        if [[ $VSCODE_VERSION_TO_RUN == 'latest' ]]; then
                return
        fi

        local versions_json
        versions_json=$(curl -sf "https://update.code.visualstudio.com/api/releases/stable")

        if [[ -z "$versions_json" ]]; then
                echo "ERROR: Failed to fetch VS Code release list."
                exit 1
        fi

        local all_versions latest_minor previous_version
        all_versions=$(echo "$versions_json" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')
        latest_minor=$(echo "$all_versions" | head -1 | grep -oE '^[0-9]+\.[0-9]+')
        previous_version=$(echo "$all_versions" | grep -v "^${latest_minor}\." | head -1)

        if [[ -z "$previous_version" ]]; then
                echo "ERROR: Could not extract previous VS Code version from release list."
                exit 1
        fi

        VSCODE_VERSION_TO_RUN="$previous_version"
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
