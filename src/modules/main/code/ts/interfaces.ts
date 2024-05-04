
export interface IPublishParams {
	name: string;
}

export interface IResponse {
	status: boolean;
	data?: {
		id: number;
		urls: string[];
	};
}