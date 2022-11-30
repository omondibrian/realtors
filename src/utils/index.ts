import fs from "fs";
import { FileUpload } from "graphql-upload-ts";
import { ImagePayload } from "../types";
import { v4 as UUiD } from "uuid";

export function saveImage(
  profileImage: FileUpload
): Promise<ImagePayload> {
  const { filename, mimetype, encoding, createReadStream } = profileImage;
  const extension = filename.split(".").pop();
  const encryptedName = `${UUiD()}_${Date.now()}.${extension}`;
  const filePath = `/storage/${encryptedName}`;
  const fullPath = `${process.env.STORAGE_PATH}/${filePath}`;
  const stream = createReadStream();

  return new Promise((res, rej) => {
    stream
      .on("error", (error: any) => {
        if (stream.closed) fs.unlinkSync(fullPath);
        rej(error);
      })
      .pipe(fs.createWriteStream(fullPath))
      .on("error", (err: any) => rej(err))
      .on("finish", () =>
        res({
          extension,
          filename,
          filePath,
          fullPath,
          encoding,
          mimetype,
        })
      );
  });
}

export function checkFileSize(
  profileImage: FileUpload,
  fileMaxSize: number
): Promise<number | boolean> {
  const { createReadStream } = profileImage;
  const stream = createReadStream();
  let fileSize = 0;
  return new Promise((res, rej) => {
    stream
      .on("data", (chunk) => {
        fileSize += chunk.length;
        if (fileSize > fileMaxSize) rej(false);
      })
      .on("error", (err: any) => rej(err))
      .on("finish", () => res(fileSize));
  });
}

export function deleteFile(filePath: string) {
  fs.unlinkSync(filePath);
}

export function fmtDate(results: Date): string {
  return `${results.getDay()}-${results.getMonth()}-${results.getFullYear()}`;
}
