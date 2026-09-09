/*
 * IBM Confidential
 * Copyright IBM Corp. 2026
 */

import { BottomBarPanel, MarkerType } from 'vscode-extension-tester'; 

export class ProblemsPage {
   
    /*
    * Verify that the problems view contains a marker with the given message.
     */
    async hasDiagnostic(message: string, markerType: MarkerType = MarkerType.Any) : Promise<boolean> {
        const bottomBar = new BottomBarPanel();
        await bottomBar.toggle(true);
        const problemsView = await bottomBar.openProblemsView();
        const markers = await problemsView.getAllVisibleMarkers(markerType);
        let found = false;
        for (const marker of markers) {
            const text = await marker.getText();
            if (text.includes(message)) {
                found = true;
                break;
            }
        }
        await bottomBar.toggle(false);
        return found;
    }
    

}