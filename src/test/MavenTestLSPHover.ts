import * as utils from './utils/testUtils';
import { runHoverTestSuite } from './shared/hoverTestSuite';

runHoverTestSuite({
    buildTool: 'maven',
    getProjectPath: utils.getMvnProjectPath,
    hoverTestCases: [
        { element: 'httpEndpoint element', line: 19, column: 10, expectedDoc: 'Configuration properties for an HTTP endpoint.' },
        { element: 'feature element', line: 16, column: 16, expectedDoc: 'Specifies a feature to be used when the server runs.' },
        { element: 'featureManager element', line: 15, column: 10, expectedDoc: 'Defines how the server loads features.' },
        { element: 'webApplication element', line: 21, column: 10, expectedDoc: 'Defines the properties of a web application.' },
        { element: 'jsp-2.3 feature value', line: 16, column: 22, expectedDoc: 'This feature enables support for Java Server Pages (JSPs) that are written to the JSP 2.3 specification.' },
        { element: 'httpPort attribute', line: 19, column: 33, expectedDoc: 'The port used for client HTTP requests. Use -1 to disable this port.' }
    ]
});
