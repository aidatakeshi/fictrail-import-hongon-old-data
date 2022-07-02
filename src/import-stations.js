import chalk from 'chalk';
import boxen from 'boxen';
import * as $ from './common.js';
import { v4 as uuid } from 'uuid';

const {client_old, client_new} = await $.getConnection();

//Find name -> id mapping for _regions & _rail_operators data
const operator_id_mapping = await $.getOperatorIDMapping(client_old, client_new);
const region_id_mapping = await $.getRegionIDMapping(client_old, client_new);

if (!Object.keys(operator_id_mapping).length || !Object.keys(region_id_mapping).length){
    console.log(chalk.red('Please import-regions and import-rail-operators first.'));
    console.log('');
    process.exit(1);
}

/**
 * stations
 */
const res1 = await client_old.query('SELECT * FROM stations', []);
const stations = res1.rows;

//Remove Old Items
await client_new.query(`DELETE FROM _stations WHERE project_id = 'hongon'`, []);

//Insert to New Database
console.log(boxen('Stations (originally Stations)'));

for (let i = 0; i < stations.length; i++){
    const item = stations[i];
    await $.insertData(client_new, '_stations', {
        id: item.id,
        project_id: 'hongon',
        major_rail_operator_id: operator_id_mapping[item.operator_id],
        region_id: region_id_mapping[item.prefecture_id],
        name: item.name_chi,
        name_l: { "en": item.name_eng },
        longitude: $.getLongitude(item.x),
        latitude: $.getLatitude(item.y),
        altitude_m: item.height_m,
        tracks: item.tracks,
        is_major: item.major,
        is_signal_only: item.is_signal_only,
        is_in_use: !item.is_abandoned,
        remarks: item.remarks,
        _data: {
            name_search: `|${item.name_chi||''}|${item.name_eng||''}`,
        },
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