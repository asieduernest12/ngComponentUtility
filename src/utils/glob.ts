import * as glob from 'glob';
import { IOptions } from "glob";

const options = {
	absolute: true
} as glob.IOptions;

export default function(pattern: string, opts?: IOptions) {
	return new Promise<string[]>((resolve, reject) => {
		glob(pattern, { ...options, ...opts }, (err, matches) => {
			if (err) {
				return reject(err);
			}

			resolve(matches);
		});
	});
}

export const init = (cwd: string) => {
	options.cwd = cwd;
};
