/*******************************************************************************
* Copyright (c) 2022, 2026 IBM Corporation and others.
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
package test.gradle.liberty.web.app.it;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.apache.hc.client5.http.classic.methods.HttpGet;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.CloseableHttpResponse;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.core5.http.HttpStatus;
import org.apache.hc.core5.http.io.entity.EntityUtils;

public class EndpointIT {
    private String URL = "http://localhost:9080/liberty-gradle-test-wrapper-app/servlet";

    @Test
    public void testServlet() throws Exception {
        try (CloseableHttpClient client = HttpClients.createDefault()) {
            HttpGet request = new HttpGet(URL);
            try (CloseableHttpResponse response = client.execute(request)) {
                int statusCode = response.getCode();
                String responseBody = EntityUtils.toString(response.getEntity());

                Assertions.assertEquals(HttpStatus.SC_OK, statusCode, "HTTP GET failed");
                Assertions.assertTrue(responseBody.contains("Hello! How are you today?"), "Unexpected response body");
            }
        }
    }
}
