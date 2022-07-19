import axios from "axios";

let projectOptions:any;
(() => {
    const response = axios({
        method: "get",
        url: 'https://start.openliberty.io/api/start/info',
        }).then( function (response) {
            projectOptions = response.data;
        });
})();
export { projectOptions };