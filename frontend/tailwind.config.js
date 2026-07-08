import { heroui } from "@heroui/theme";

export default {
    content: [
        "./index.html",
        "./src/**/*.{js,jsx}",
        "./node_modules/@heroui/theme/dist/**/*.{js,jsx}",
    ],
    plugins: [heroui()],
};