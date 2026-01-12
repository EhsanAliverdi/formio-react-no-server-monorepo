declare module "*.svg?react" {
	import * as React from "react";

	export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }>;
	const component: React.FC<React.SVGProps<SVGSVGElement> & { title?: string }>;
	export default component;
}
