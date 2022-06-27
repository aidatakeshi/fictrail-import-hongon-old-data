import chalk from 'chalk';
import boxen from 'boxen';
import * as $ from './common.js';
import { v4 as uuid } from 'uuid';

const {client_old, client_new} = await $.getConnection();

/**
 * prefecture_areas
 */

//Get Old Data
const res1 = await client_old.query('SELECT * FROM prefecture_areas', []);
const prefecture_areas = res1.rows;

//Map Old IDs to New UUIDs
let id_to_uuid = {};
for (let item of prefecture_areas){
    id_to_uuid[item.id] = uuid();
}

//Remove Old Items
await client_new.query('DELETE FROM _regions_broader WHERE project_id = \'hongon\'', []);

//Insert to New Database
console.log(boxen('RegionsBroader (originally PrefectureAreas)'));

for (let i = 0; i < prefecture_areas.length; i++){
    const item = prefecture_areas[i];
    await $.insertData(client_new, '_regions_broader', {
        id: id_to_uuid[item.id],
        project_id: 'hongon',
        name: item.name_chi,
        name_l: { "en": item.name_eng },
        sort: item.sort,
        remarks: item.remarks,
        _names: `${item.name_chi||''}\n${item.name_eng||''}`,
        created_at: Math.floor(new Date().getTime() / 1000),
        created_by: 'hongon',
    });
    console.log(chalk.yellow(`#${i}: `) + `${item.name_chi} / ${item.name_eng}`);
}
console.log("");

/**
 * prefectures
 */

const res2 = await client_old.query('SELECT * FROM prefectures', []);
const prefectures = res2.rows;

//Remove Old Items
await client_new.query('DELETE FROM _regions WHERE project_id = \'hongon\'', []);

//Insert to New Database
console.log(boxen('Regions (originally Prefectures)'));

for (let i = 0; i < prefectures.length; i++){
    const item = prefectures[i];
    await $.insertData(client_new, '_regions', {
        id: uuid(),
        project_id: 'hongon',
        region_broader_id: id_to_uuid[item.area_id],
        name: item.name_chi,
        name_l: { "en": item.name_eng },
        name_suffix: item.name_chi_suffix,
        name_suffix_l: { "en": item.name_eng_suffix },
        name_short: item.name_chi_short,
        name_short_l: { "en": item.name_eng_short },
        sort: item.sort,
        remarks: item.remarks,
        _names: `${item.name_chi||''}${item.name_chi_suffix||''}`
        + `\n${item.name_eng||''}${item.name_eng_suffix||''}`
        + `\n${item.name_chi_short||''}\n${item.name_eng_short||''}`,
        created_at: Math.floor(new Date().getTime() / 1000),
        created_by: 'hongon',
    });
    console.log(chalk.yellow(`#${i}: `) + `${item.name_chi} / ${item.name_eng}`);
}
console.log("");

/**
 * End
 */
process.exit(1);