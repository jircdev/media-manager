import { promises as fs } from 'fs';
import * as path from 'path';

export async function fileExists(filePath: string): Promise<boolean> {
	// Convert the path to the format suitable for the current OS
	const formattedPath = path.normalize(filePath);

	try {
		// fs.access will throw an error if the file does not exist or is not readable
		await fs.access(formattedPath, fs.constants.R_OK);

		// If no error was thrown, the file exists and is readable
		return true;
	} catch (err) {
		// An error was thrown, so the file either does not exist or is not readable
		return false;
	}
}
