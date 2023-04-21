/*******************************************************************************
* Copyright (c) 2022 IBM Corporation and others.
*
* This program and the accompanying materials are made available under the
* terms of the Eclipse Public License v. 2.0 which is available at
* http://www.eclipse.org/legal/epl-2.0.
*
* SPDX-License-Identifier: EPL-2.0
*
* Contributors:
*     IBM Corporation - initial implementation
*******************************************************************************/
package test.maven.liberty.web.app.it;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpStatus;
import org.apache.commons.httpclient.methods.GetMethod;

public class EndpointIT {
    private String URL = "http://localhost:9080/liberty.maven.test.wrapper.app/servlet";

    @Test
    public void testServlet() throws Exception {
        HttpClient client = new HttpClient();
        
        GetMethod method = new GetMethod(URL);

        try {
            int statusCode = client.executeMethod(method);

            Assertions.assertEquals(HttpStatus.SC_OK, statusCode, "HTTP GET failed");

            String response = method.getResponseBodyAsString(1000);

            Assertions.assertTrue(response.contains("Hello! How are you today?"), "Unexpected response body");
        } finally {
            method.releaseConnection();
        }  
    }
}
