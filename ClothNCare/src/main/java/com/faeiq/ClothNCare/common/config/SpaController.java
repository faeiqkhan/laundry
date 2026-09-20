package com.faeiq.ClothNCare.common.config;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaController {

    @GetMapping({
            "/dashboard",
            "/orders",
            "/customers",
            "/services",
            "/reports",
            "/expenses",
            "/settings",
            "/register",
            "/staff",
            "/products",
            "/expense-heads",
            "/additional-charges",
            "/storage-bags",
            "/storage-racks",
            "/price-lists",
            "/create-price-list",
            "/pos",
            "/delivery-orders",
            "/invoices",
            "/collection",
            "/payments",
            "/multi-expense",
            "/analytical-dashboard",
            "/yearly-dashboard"
    })
    public String forwardToIndex() {
        return "forward:/index.html";
    }
}
