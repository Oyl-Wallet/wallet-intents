import { getInscriptionsFromInput, getRuneFromOutputs } from "../src/helpers";
import { WITNESS_SCRIPTS } from "./mocks/constants";

test("Decodes collectible inscription from input witness correctly", async () => {
  const inscriptions = getInscriptionsFromInput(
    {
      txid: "dbee942f3bfcc86996e26d60d14c96cde75c49ab410fc5429f298ec2af454aee",
      witness: WITNESS_SCRIPTS.IMAGE_PNG,
    },
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f"
  );

  expect(inscriptions).toHaveLength(1);
  expect(inscriptions[0]).toHaveProperty(
    "id",
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88fi0"
  );
  expect(inscriptions[0]).toHaveProperty("content_type", "image/png");
  expect(inscriptions[0]).toHaveProperty(
    "content",
    "iVBORw0KGgoAAAANSUhEUgAAABgAAAAYCAIAAABvFaqvAAAACXBIWXMAAAsTAAALEwEAmpwYAAAFyWlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgOS4wLWMwMDEgNzkuYzAyMDRiMiwgMjAyMy8wMi8wOS0wNjoyNjoxNCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczpkYz0iaHR0cDovL3B1cmwub3JnL2RjL2VsZW1lbnRzLzEuMS8iIHhtbG5zOnBob3Rvc2hvcD0iaHR0cDovL25zLmFkb2JlLmNvbS9waG90b3Nob3AvMS4wLyIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0RXZ0PSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VFdmVudCMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIDI0LjUgKFdpbmRvd3MpIiB4bXA6Q3JlYXRlRGF0ZT0iMjAyNC0wMi0yMVQyMjo1NDo0MSswMzowMCIgeG1wOk1vZGlmeURhdGU9IjIwMjQtMDItMjFUMjM6MTE6NDcrMDM6MDAiIHhtcDpNZXRhZGF0YURhdGU9IjIwMjQtMDItMjFUMjM6MTE6NDcrMDM6MDAiIGRjOmZvcm1hdD0iaW1hZ2UvcG5nIiBwaG90b3Nob3A6Q29sb3JNb2RlPSIzIiB4bXBNTTpJbnN0YW5jZUlEPSJ4bXAuaWlkOmYyNTNiMDViLWNlOGQtMWQ0Yy04M2FhLWZjYjllM2JlMmU4YiIgeG1wTU06RG9jdW1lbnRJRD0i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"
  );
});

test("Decodes BRC-20 transfer inscription from input witness correctly", async () => {
  const inscriptions = getInscriptionsFromInput(
    {
      txid: "dbee942f3bfcc86996e26d60d14c96cde75c49ab410fc5429f298ec2af454aee",
      witness: WITNESS_SCRIPTS.BRC20_TRANSFER,
    },
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88f"
  );

  expect(inscriptions).toHaveLength(1);
  expect(inscriptions[0]).toHaveProperty(
    "id",
    "1bd07c9c92c56ff1d74a45e3b72fb7c0a5de02ca51bed4741b1c4c74f166e88fi0"
  );
  expect(inscriptions[0]).toHaveProperty(
    "content_type",
    "text/plain;charset=utf-8"
  );
  expect(inscriptions[0]).toHaveProperty(
    "content",
    "eyJwIjoiYnJjLTIwIiwib3AiOiJ0cmFuc2ZlciIsInRpY2siOiJiZXRmIiwiYW10IjoiMjAwIn0="
  );
});

test("Decodes RUNE etching from input witness correctly", async () => {
  const rune = getRuneFromOutputs([
    {
      scriptpubkey:
        "51207c096f59842eb86e772cf575fac55f707abb8b54c1d430980ee34959286f0e7d",
      scriptpubkey_asm:
        "OP_PUSHNUM_1 OP_PUSHBYTES_32 7c096f59842eb86e772cf575fac55f707abb8b54c1d430980ee34959286f0e7d",
      scriptpubkey_type: "v1_p2tr",
      scriptpubkey_address:
        "bcrt1p0syk7kvy96uxuaev746l432lwpathz65c82rpxqwudy4j2r0pe7s9xh7v0",
      value: 546,
    },
    {
      scriptpubkey:
        "6a5d1d020304b3f1b3949fae97e9c505010006904e05ae080ae80708b090810a",
      scriptpubkey_asm:
        "OP_RETURN OP_PUSHNUM_13 OP_PUSHBYTES_29 020304b3f1b3949fae97e9c505010006904e05ae080ae80708b090810a",
      scriptpubkey_type: "op_return",
      value: 0,
    },
  ]);

  expect(rune).not.toBeNull();
  expect(rune?.etching).toHaveProperty("premine", 10000n);
  expect(rune?.etching).toHaveProperty("divisibility", 0);
  expect(rune?.etching).toHaveProperty("runeName", "TOYLRUNESTONEB");
  expect(rune?.etching).toHaveProperty("symbol", "Ю");
  expect(rune?.etching).toHaveProperty("turbo", true);
  expect(rune?.etching).toHaveProperty("terms.amount", 1000n);
  expect(rune?.etching).toHaveProperty("terms.cap", 20990000n);
});
