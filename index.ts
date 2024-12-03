import puppeteer from "puppeteer-core";
import fs from "node:fs/promises";
import rl from "node:readline/promises";
const chrome = await puppeteer.launch({ channel: "chrome", headless: false });
const page = await chrome.newPage();
// Insert your link here
let nextPage: string | false =
	"https://hpaudiobooks.app/4-harry-potter-goblet-fire-audiobook-read-stephen-fry/";
const readline = rl.createInterface({
	input: process.stdin,
	output: process.stdout,
});
if (!nextPage) nextPage = await readline.question("LINK: ");
let links: string[] = [];

while (nextPage) {
	await page.goto(nextPage, { waitUntil: "domcontentloaded" });
	await page.evaluate(() => {
		window.scrollTo(0, window.document.body.scrollHeight);
	});
	links = links.concat(
		await page.$$eval("audio", (audios) => audios.map((a) => a.src))
	);
	console.log(links);

	nextPage = await page.$eval(
		".post-page-numbers:last-child",
		(s: HTMLAnchorElement | Element) =>
			//@ts-ignore
			s.innerText.includes("Next") ? s.href : false
	);
	nextPage = await page.$eval(".pgntn-page-pagination-block", (s) =>
		s.lastElementChild?.innerHTML.includes("Next")
			? s.lastElementChild.href
			: false
	);
}

await page.close();
await fs.writeFile("./links.json", JSON.stringify(links, void 0, 2));

downloadFiles(links, "./downloads_harry_potter");

async function downloadFile(uri: string, savePath: string) {
	const response = await fetch(uri);
	if (!response.ok) {
		throw new Error(`Failed to download ${uri}: ${response.statusText}`);
	}
	const data = new Uint8Array(await response.arrayBuffer());
	await fs.writeFile(savePath, data);
	console.log(`Downloaded and saved: ${savePath}`);
}
async function ensureDir(dir: string) {
	if (await fs.exists(dir)) {
		return true;
	} else {
		await fs.mkdir(dir);
		return true;
	}
}
// Main function to process an array of URIs
async function downloadFiles(uris: string[], saveDir: string) {
	await ensureDir(saveDir); // Ensure the directory exists
	for (const uri of uris) {
		const fileName = uri.split("/").pop() || "unknown_file";
		const savePath = `${saveDir}/${decodeURIComponent(fileName).slice(
			0,
			-4
		)}`;
		try {
			await downloadFile(uri, savePath);
		} catch (error) {
			console.error(error);
		}
	}
}
