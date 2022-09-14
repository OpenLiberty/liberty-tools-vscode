const nlsConfig = JSON.parse(process.env.VSCODE_NLS_CONFIG!);
let messages: any = undefined;
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
          const fileName = nlsConfig['locale'] + ".json";
            messages = require("../locales/" + fileName);
          } catch (e) {
            console.error(`Localized messages for language ${nlsConfig['locale']} does not exist.  Use en.`);
            messages = require("../locales/en.json");
          }
    }
    
    let message = messages[key];
    for (let i = 0; i < args.length; i++) {
        message = message.replace(new RegExp('\{ *' + i + ' *\}', 'g'), args[i]);
    }
    return message;
}

