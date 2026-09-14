package com.faeiq.ClothNCare.migration.parse;

/**
 * Raised while mapping a single Swash CSV row when a field cannot be
 * interpreted (bad number, bad date, ...). The row is skipped but the issue is
 * recorded so the migration report stays complete.
 */
public final class SwashParseIssue {

    private final String source;
    private final int rowNumber;
    private final String type;
    private final String field;
    private final String value;
    private final String message;

    public SwashParseIssue(String source, int rowNumber, String type,
                           String field, String value, String message) {
        this.source = source;
        this.rowNumber = rowNumber;
        this.type = type;
        this.field = field;
        this.value = value;
        this.message = message;
    }

    public String getSource() {
        return source;
    }

    public int getRowNumber() {
        return rowNumber;
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

    public String getMessage() {
        return message;
    }
}