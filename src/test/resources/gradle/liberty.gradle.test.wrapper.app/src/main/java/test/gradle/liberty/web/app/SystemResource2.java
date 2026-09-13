package test.gradle.liberty.web.app;

import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/path")
public class SystemResource2 {

    @GET
    @Produces(MediaType.TEXT_PLAIN)
    public String methodname() {
        return "hello";
    }
}