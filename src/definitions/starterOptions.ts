import axios from "axios";

export async function getProjectOptions(): Promise<any> {
    const response = await axios({
        method: "get",
        url: 'https://start.openliberty.io/api/start/info',
        })
    return response.data;
  }