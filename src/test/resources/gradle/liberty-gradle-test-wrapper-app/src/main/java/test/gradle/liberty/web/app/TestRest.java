package test.gradle.liberty.web.app;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/path")
public class TestRest {

    @GET
    @Produces(MediaType.TEXT_PLAIN)
    private String methodname() {
        return "hello";
    }
}