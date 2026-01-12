export type FormSummary = {
	id: number;
	name: string;
};

export type FormJson = {
	_id?: string;
	title: string;
	name: string;
	path?: string;
	type?: string;
	display?: string;
	components: any[];
};
