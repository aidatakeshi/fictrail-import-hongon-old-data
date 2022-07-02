import chalk from 'chalk';
import boxen from 'boxen';
import * as $ from './common.js';
import { v4 as uuid } from 'uuid';

const {client_old, client_new} = await $.getConnection();

//Find name -> id mapping for _rail_operators data
const operator_id_mapping = await $.getOperatorIDMapping(client_old, client_new);

if (!Object.keys(operator_id_mapping).length){
    console.log(chalk.red('Please import-rail-operators first.'));
    console.log('');
    process.exit(1);
}

/**
 * train_types
 */

//Get Old Data
const res1 = await client_old.query('SELECT * FROM train_types', []);
const train_types = res1.rows;

//Map Old IDs to New UUIDs
let id_to_uuid = {};
for (let item of train_types){
    id_to_uuid[item.id] = uuid();
}

//Remove Old Items
await client_new.query('DELETE FROM _train_service_types WHERE project_id = \'hongon\'', []);

//Insert to New Database
console.log(boxen('TrainServiceTypes (originally TrainTypes)'));

for (let i = 0; i < train_types.length; i++){
    const item = train_types[i];
    await $.insertData(client_new, '_train_service_types', {
        id: id_to_uuid[item.id],
        project_id: 'hongon',
        rail_operator_id: operator_id_mapping[item.operator_id],
        name: item.name_chi,
        name_l: { "en": item.name_eng },
        name_short: item.name_chi_short,
        name_short_l: { "en": item.name_eng_short },
        color: item.color,
        color_text: item.color_text,
        sort: item.sort,
        remarks: item.remarks,
        _data: {
            _name_search: `|${item.name_chi||''}|${item.name_eng||''}`,
        },
        created_at: Math.floor(new Date().getTime() / 1000),
        created_by: 'hongon',
    });
    console.log(chalk.yellow(`#${i}: `) + `${item.name_chi} / ${item.name_eng}`);
}
console.log("");

/**
 * train_names
 */

const res2 = await client_old.query('SELECT * FROM train_names', []);
const train_names = res2.rows;

//Remove Old Items
await client_new.query('DELETE FROM _train_service_names WHERE project_id = \'hongon\'', []);

//Insert to New Database
console.log(boxen('TrainServiceNames (originally TrainNames)'));

for (let i = 0; i < train_names.length; i++){
    const item = train_names[i];
    await $.insertData(client_new, '_train_service_names', {
        id: uuid(),
        project_id: 'hongon',
        train_service_type_id: id_to_uuid[item.train_type_id],
        major_rail_operator_id: operator_id_mapping[item.major_operator_id],
        name: item.name_chi,
        name_l: { "en": item.name_eng },
        color: item.color,
        color_text: item.color_text,
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