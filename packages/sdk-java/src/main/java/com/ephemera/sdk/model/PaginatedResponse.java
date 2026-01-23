package com.ephemera.sdk.model;

import java.util.List;

public class PaginatedResponse<T> {
    private List<T> data;
    private String nextCursor;
    private Meta meta;

    public static class Meta {
        private int total;
        private int offset;
        private int limit;

        public int getTotal() { return total; }
        public void setTotal(int total) { this.total = total; }

        public int getOffset() { return offset; }
        public void setOffset(int offset) { this.offset = offset; }

        public int getLimit() { return limit; }
        public void setLimit(int limit) { this.limit = limit; }
    }

    public List<T> getData() { return data; }
    public void setData(List<T> data) { this.data = data; }

    public String getNextCursor() { return nextCursor; }
    public void setNextCursor(String nextCursor) { this.nextCursor = nextCursor; }

    public Meta getMeta() { return meta; }
    public void setMeta(Meta meta) { this.meta = meta; }
}
