/**
 * Copyright (c) 2022 IBM Corporation.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 */
 import * as fs from "fs";
 
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const nlsConfig = JSON.parse(process.env.VSCODE_NLS_CONFIG!);
let messages: any = undefined;
let commandTranslations: any = undefined;
/**
 * Returns the localized string.
 * 
 * @param key The givien message key
 * @param args The parameters of the messge.
 * @returns The localized message.
 */
export function localize(key: string, ...args: any[]): string {
    if ( messages === undefined ) {
        try {
            const fileName = "../locales/" + nlsConfig["locale"] + ".json";
            if (fs.existsSync(fileName)) {
              messages = require(fileName);
            } else {
              messages = require("../locales/en.json");
            }
          } catch (e) {
            console.error(`Localized messages for language ${nlsConfig["locale"]} does not exist.  Use en.`);
            messages = require("../locales/en.json");
          }
    }

    if ( commandTranslations === undefined ) {
      try {
          const fileName = "../../" +  "package.nls." + nlsConfig["locale"] + ".json";
          if (fs.existsSync(fileName)) {
            commandTranslations = require(fileName);
          } else {
            commandTranslations = require("../../package.nls.json");
          }
        } catch (e) {
          console.error(`Localized messages for language ${nlsConfig["locale"]} does not exist for package.json.  Use en.`);
          commandTranslations = require("../../package.nls.json");
        }
    }
    
    let message = messages[key];
    if ( message === undefined ) {
      message = commandTranslations[key];
    }
    for (let i = 0; i < args.length; i++) {
        message = message.replace(new RegExp("\\{ *" + i + " *\\}", "g"), args[i]);
    }
    return message;
}

