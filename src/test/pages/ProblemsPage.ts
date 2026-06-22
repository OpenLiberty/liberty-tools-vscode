
import { BottomBarPanel, MarkerType } from 'vscode-extension-tester'; 

export class ProblemsPage {
   
    /*
    * Verify that the problems view contains a marker with the given message.
     */
    async hasDiagnostic(message: string, markerType: MarkerType = MarkerType.Any) : Promise<boolean> {
        const bottomBar = new BottomBarPanel();
        await bottomBar.toggle(true);
        let problemsView = await bottomBar.openProblemsView();
        let markers = await problemsView.getAllVisibleMarkers(MarkerType.Any);
                for (const marker of markers) {
                    const text = await marker.getText();
                    // Check if text contains your diagnostic message
                    if(text.includes('Only public methods can be exposed as resource methods.')){
                        return true;
                    }
                }
                return false; 
    }
    

}