package com.faeiq.ClothNCare.expensehead.dto;

import lombok.Data;

@Data
public class ExpenseHeadDTO {

    private String name;

    private String description;

    private boolean active = true;
}
