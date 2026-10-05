import type { ComponentProps } from "react";

type NftImageProps = Omit<ComponentProps<"img">, "src" | "srcSet" | "width" | "height"> & { image: string };

export function NftImage({ image, sizes = "(max-width: 640px) 100vw, (max-width: 1100px) 40vw, 25vw", ...props }: NftImageProps) {
  const base = image.replace(/\.png$/i, "").replace(/-\d+$/i, "");
  const source = `${base}-1000.webp`;
  const srcSet = [250, 500, 1000].map((width) => `${base}-${width}.webp ${width}w`).join(", ");
  return <img {...props} src={source} srcSet={srcSet} sizes={sizes} width={1000} height={1000} />;
}
