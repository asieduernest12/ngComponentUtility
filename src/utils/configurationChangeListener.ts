import * as _ from 'lodash';
import * as vsc from 'vscode';

export class ConfigurationChangeListener {
	private lastConfig: vsc.WorkspaceConfiguration;
	private eventEmitter: vsc.EventEmitter<IConfigurationChangedEvent>;
	private disposable: vsc.Disposable;

	constructor(private section: string) {
		this.lastConfig = vsc.workspace.getConfiguration(section);
		this.eventEmitter = new vsc.EventEmitter<IConfigurationChangedEvent>();

		this.disposable = vsc.Disposable.from(
			this.eventEmitter,
			vsc.workspace.onDidChangeConfiguration(this.onChanged, this)
		);
	}

	private onChanged = (event: vsc.ConfigurationChangeEvent) => {
		if (!event.affectsConfiguration(this.section)) {
			return;
		}

		const current = vsc.workspace.getConfiguration(this.section);

		const changedKeys = _(Object.keys(current))
			.filter(key => !(current[key] instanceof Function))
			.filter(key => !_.isEqual(current[key], this.lastConfig[key]))
			.value();

		this.eventEmitter.fire(Object.freeze({
			config: current,
			changedKeys,
			hasChanged: (...keys: string[]) => keys.some(key => _.includes(changedKeys, key))
		}));

		this.lastConfig = current;
	}

	get onDidChange() {
		return this.eventEmitter.event;
	}

	public dispose = () => {
		this.disposable.dispose();
	}
}

export interface IConfigurationChangedEvent {
	config: vsc.WorkspaceConfiguration;
	changedKeys: string[];

	hasChanged(...keys: string[]): boolean;
}
