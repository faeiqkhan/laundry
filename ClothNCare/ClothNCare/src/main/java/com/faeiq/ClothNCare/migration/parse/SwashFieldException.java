package com.faeiq.ClothNCare.migration.parse;

/**
 * Signals a single un-parseable cell inside otherwise valid swash CSV data.
 */
public final class SwashFieldException extends RuntimeException {

    private final String type;
    private final String field;
    private final String value;

    public SwashFieldException(String type, String field, String value, String message) {
        super(message);
        this.type = type;
        this.field = field;
        this.value = value;
    }

    public String getType() {
        return type;
    }

    public String getField() {
        return field;
    }

    public String getValue() {
        return value;
    }
}