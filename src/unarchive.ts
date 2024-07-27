import { File } from "@opswalrus/percolate/file";
import decompress from "decompress";
import decompressTarGzPlugin from "decompress-targz";
import { getStreamAsBuffer } from "get-stream";
import decompressTarPlugin from "decompress-tar";
import { fileTypeFromBuffer } from "file-type";
import { isStream } from "is-stream";
// import decompressTarXzPlugin from "decompress-tarxz";
import decompressZipPlugin from "decompress-unzip";
import { match, P } from "ts-pattern";
import xzdecompress from "xz-decompress";

export async function unarchive(inputPath: string, outputPath: string): Promise<void> {
  const filename = File.basename(inputPath);
  return await match(filename)
    .with(P.string.regex(/.tar.xz$/), () => decompressTarXz(inputPath, outputPath))
    .with(P.string.regex(/.tar.gz$/), () => decompressTarGz(inputPath, outputPath))
    .with(P.string.regex(/.zip$/), () => decompressZip(inputPath, outputPath))
    .otherwise(() => {
      throw new Error(`unable to decompress unknown file type: ${inputPath}`);
    });
}

export async function decompressTarGz(inputPath: string, outputPath: string, dropRootDir = 1) {
  await decompress(inputPath, outputPath, {
    plugins: [decompressTarGzPlugin()],
    strip: dropRootDir,
  });
}

async function decompressTarXzPlugin(input) {
  const isBuffer = Buffer.isBuffer(input);
  const type = isBuffer ? await fileTypeFromBuffer(input) : null;

  if (!isBuffer && !isStream(input)) {
    return Promise.reject(new TypeError(`Expected a Buffer or Stream, got ${typeof input}`));
  }

  if (isBuffer && (!type || type.ext !== "xz")) {
    return Promise.resolve([]);
  }

  let xzStream: xzdecompress.XzReadableStream;
  if (isBuffer) {
    const blob = new Blob([input]); // interface Buffer extends Uint8Array {...}
    xzStream = new xzdecompress.XzReadableStream(blob.stream());
  } else {
    // stream
    xzStream = new xzdecompress.XzReadableStream(input);
  }

  return decompressTarPlugin()(await getStreamAsBuffer(xzStream));
}

export async function decompressTarXz(inputPath: string, outputPath: string, dropRootDir = 1) {
  await decompress(inputPath, outputPath, {
    plugins: [decompressTarXzPlugin],
    strip: dropRootDir,
  });
}

export async function decompressZip(inputPath: string, outputPath: string, dropRootDir = 1) {
  await decompress(inputPath, outputPath, {
    plugins: [decompressZipPlugin()],
    strip: dropRootDir,
  });
}
