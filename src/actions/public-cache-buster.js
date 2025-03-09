let version = Date.now();

export const modifyPublicAssetUrl = (url) => {
    return `${url}?v=${version}`;
};
