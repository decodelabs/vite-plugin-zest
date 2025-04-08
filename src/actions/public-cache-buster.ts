let version = Date.now();

export const modifyPublicAssetUrl = (
    url: string
): string => {
    return `${url}?v=${version}`;
};
