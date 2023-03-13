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

# Current time.
currentTime=(date +"%Y/%m/%d-%H:%M:%S:%3N")

# Operating system.
OS=$(uname -s)

main() {
    echo -e "\n> $(${currentTime[@]}): Build: Building the plugin"

    # Tell the terminal session to use display port 88.
    export DISPLAY=:88.0

    # Install software.
    if [ $OS = "Linux" ]; then
        # Start the X display server on port 88.
        Xvfb -ac :88 -screen 0 1280x1024x16 > /dev/null 2>&1 &

        #  Start the window manager.
        metacity --sm-disable --replace 2> metacity.err &
    fi

    # Build VSE package
    npm install
    npm install -g vsce
    npm run build
    npm run compile
    vsce package
    npm run test-compile

    # Run the plugin's install goal against the 1.74
    npm run test -- -u -c 1.74.0
    # Run the plugin's install goal against the 1.75
    npm run test -- -u -c 1.75.0
    # Run the plugin's install goal against the latest    
    npm run test -- -u

    # If there were any errors, gather some debug data before exiting.
    rc=$?
    if [ "$rc" -ne 0 ]; then
        echo "ERROR: Failure while driving npm install on plugin. rc: ${rc}."

        echo "DEBUG: Liberty messages.log:\n"
        cat src/test/resources/applications/maven/mavenProject/target/liberty/wlp/usr/servers/defaultServer/logs/messages.log

        echo "DEBUG: Environment variables:\n"
        env

        exit -1
    fi
}

main "$@"
