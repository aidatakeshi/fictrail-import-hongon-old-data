import chalk from 'chalk';
import boxen from 'boxen';
import * as $ from './common.js';
import { v4 as uuid } from 'uuid';

const {client_old, client_new} = await $.getConnection();

/**
 * vehicle_performance_groups
 */

//Get Old Data
const res1 = await client_old.query('SELECT * FROM vehicle_performance_groups', []);
const vehicle_performance_groups = res1.rows;

//Map Old IDs to New UUIDs
let id_to_uuid = {};
for (let item of vehicle_performance_groups){
    id_to_uuid[item.id] = uuid();
}

//Remove Old Items
await client_new.query('DELETE FROM _train_vehicle_types WHERE project_id = \'hongon\'', []);

//Insert to New Database
console.log(boxen('TrainVehicleTypes (originally VehiclePerformanceGroups)'));

for (let i = 0; i < vehicle_performance_groups.length; i++){
    const item = vehicle_performance_groups[i];
    await $.insertData(client_new, '_train_vehicle_types', {
        id: id_to_uuid[item.id],
        project_id: 'hongon',
        name: item.name_chi,
        name_l: { "en": item.name_eng || "" },
        sort: item.sort,
        remarks: item.remarks,
        _names: `|${item.name_chi||''}|${item.name_eng||''}`,
        created_at: Math.floor(new Date().getTime() / 1000),
        created_by: 'hongon',
    });
    console.log(chalk.yellow(`#${i}: `) + `${item.name_chi} / ${item.name_eng}`);
}
console.log("");

/**
 * vehicle_performance_items
 */

const res2 = await client_old.query('SELECT * FROM vehicle_performance_items', []);
const vehicle_performance_items = res2.rows;

//Remove Old Items
await client_new.query('DELETE FROM _train_vehicle_specs WHERE project_id = \'hongon\'', []);

//Insert to New Database
console.log(boxen('TrainVehicleSpecs (originally VehiclePerformanceItems)'));

for (let i = 0; i < vehicle_performance_items.length; i++){
    const item = vehicle_performance_items[i];
    await $.insertData(client_new, '_train_vehicle_specs', {
        id: uuid(),
        project_id: 'hongon',
        train_vehicle_type_id: id_to_uuid[item.group_id],
        name: item.name_chi,
        remarks: item.remarks,
        specs: {
            motor_ratio: item.motor_ratio,
            motor_rated_kw: item.motor_rated_kw,
            motor_overclock_ratio: item.motor_overclock_ratio,
            crush_capacity: item.crush_capacity,
            empty_mass_avg_t: item.empty_mass_avg_t,
            max_accel_kph_s: item.max_accel_kph_s,
            resistance_loss_per_100kph: item.resistance_loss_per_100kph,
            resistance_loss_per_100kph_q: item.resistance_loss_per_100kph_q,
            const_power_accel_ratio: item.const_power_accel_ratio,
            max_speed_kph: item.max_speed_kph,
            max_decel_kph_s: item.max_decel_kph_s,
            min_decel_kph_s: item.min_decel_kph_s,
            const_decel_max_kph: item.const_decel_max_kph,
            depart_additional_time_s: item.depart_additional_time_s,
        },
        _results: item.calc_results_other || {},
        _results_by_kph: item.calc_results_by_kph || [],
        _names: `|${item.name_chi||''}|${item.name_eng||''}`,
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