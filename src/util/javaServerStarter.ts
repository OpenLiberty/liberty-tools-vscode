/**
 * Copyright 2019 Red Hat, Inc. and others.

 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at

 *     http://www.apache.org/licenses/LICENSE-2.0

 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * 
 */

import * as os from 'os';
import * as path from 'path';
import { workspace } from 'vscode';
import { Executable, ExecutableOptions } from 'vscode-languageclient/node';
import { RequirementsData } from './requirements';
import * as glob from 'glob';
import {JAKARTA_LS_JAR, LIBERTY_LS_JAR} from '../extension'

const DEBUG = startedInDebugMode();
const LIBERTY_LS_DEBUG_PORT = 8002;
const JAKARTA_LS_DEBUG_PORT = 8003;

// Referenced:
// https://github.com/redhat-developer/vscode-microprofile/blob/master/src/languageServer/javaServerStarter.ts

export function prepareExecutable(jarName: string, requirements: RequirementsData): Executable {
  const executable: Executable = Object.create(null);
  const options: ExecutableOptions = Object.create(null);
  options.env = process.env;
  executable.options = options;
  executable.command = path.resolve(requirements.tooling_jre + '/bin/java');
  executable.args = prepareParams(jarName);
  return executable;
}

function prepareParams(jarName: string): string[] {
  const params: string[] = [];

  // will only add debug args when run in development, not when run as an extension
  if (DEBUG) {
    if (jarName === LIBERTY_LS_JAR) {
      params.push(`-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${LIBERTY_LS_DEBUG_PORT},quiet=y`);
    }
    else if (jarName === JAKARTA_LS_JAR) {
      params.push(`-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=${JAKARTA_LS_DEBUG_PORT},quiet=y`);
    } 
  }

  const jarHome = path.resolve(__dirname, "../jars");
  params.push('-jar');
  params.push(path.join(jarHome, jarName));

  return params;
}

function hasDebugFlag(args: string[]): boolean {
  if (args) {
    // See https://nodejs.org/en/docs/guides/debugging-getting-started/
    return args.some(arg => /^--inspect/.test(arg) || /^--debug/.test(arg));
  }
  return false;
}

function startedInDebugMode(): boolean {
  const args: string[] = process.execArgv;
  return hasDebugFlag(args);
}