import { httpRouter } from 'convex/server';
import { fileOptions, uploadFile, downloadFile } from './plannerFiles';

const http = httpRouter();
http.route({ path: '/planner/files', method: 'OPTIONS', handler: fileOptions });
http.route({ path: '/planner/files', method: 'POST', handler: uploadFile });
http.route({ path: '/planner/files', method: 'GET', handler: downloadFile });
export default http;
