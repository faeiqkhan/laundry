package com.faeiq.ClothNCare.common.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String invoiceLocation = Path.of("invoices").toAbsolutePath().normalize().toUri().toString();
        if (!invoiceLocation.endsWith("/")) {
            invoiceLocation = invoiceLocation + "/";
        }

        registry.addResourceHandler("/invoices/**")
                .addResourceLocations(invoiceLocation);
    }

    @Override
    public void addViewControllers(ViewControllerRegistry registry) {
        registry.addViewController("/{spring:[^\\.]*}")
                .setViewName("forward:/index.html");
        registry.addViewController("/**/{spring:[^\\.]*}")
                .setViewName("forward:/index.html");
    }
}
