export const formatDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : "—");

export const formatBytes = (size?: number | null) => {
    if (!size) return "0 B";
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return (
        (size / Math.pow(1024, i)).toFixed(2) + " " + ["B", "KB", "MB", "GB"][i]
    );
};

export const isImage = (mime?: string | null) => mime?.startsWith("image/");
