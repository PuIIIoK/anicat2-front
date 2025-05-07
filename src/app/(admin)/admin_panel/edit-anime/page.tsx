import EditAnimePage from "../../../component/edit-anime-page/edit-anime-page-provider";
import {Suspense} from "react";

const AddAnimePageWrapper = () => (
    <Suspense fallback={<div>Загрузка...</div>}>
        <EditAnimePage />
    </Suspense>
);

export default AddAnimePageWrapper;
