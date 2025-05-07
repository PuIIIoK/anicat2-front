import AddAnimePage from "../../../component/add-anime-page/add-anime-page-provider";
import {Suspense} from "react";

const AddAnimePageWrapper = () => (
    <Suspense fallback={<div>Загрузка...</div>}>
        <AddAnimePage />
    </Suspense>
);

export default AddAnimePageWrapper;
