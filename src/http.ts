import type { PathLike } from "node:fs";
import { createWriteStream, unlink } from "node:fs";
import { get } from "node:https";

export async function downloadFile(url: any, dest: PathLike): Promise<string> {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(dest, { flags: "wx" });

    const request = get(url, (response) => {
      if (response.statusCode === 200) {
        response.pipe(file);
      } else {
        file.close();
        unlink(dest, () => {}); // Delete temp file
        reject(`Server responded with ${response.statusCode}: ${response.statusMessage}`);
      }
    });

    request.on("error", (err) => {
      file.close();
      unlink(dest, () => {}); // Delete temp file
      reject(err.message);
    });

    file.on("finish", () => {
      resolve(dest.toString());
    });

    file.on("error", (err) => {
      file.close();

      if (err.code === "EEXIST") {
        reject(new Error("File already exists"));
      } else {
        unlink(dest, () => {}); // Delete temp file
        reject(err.message);
      }
    });
  });
}
