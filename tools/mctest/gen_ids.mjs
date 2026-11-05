// Generates src/mc/ids.json: packet ids by protocol number from the minecraft-data package (dev-time only).
import mcdata from 'minecraft-data'; import fs from 'node:fs';
const VERS = { 777:'26.3',776:'26.2',775:'26.1',774:'1.21.11',773:'1.21.9',772:'1.21.8',771:'1.21.6',770:'1.21.5',769:'1.21.4',768:'1.21.3',767:'1.21.1',766:'1.20.6',765:'1.20.4',764:'1.20.2',763:'1.20.1',762:'1.19.4',761:'1.19.3',760:'1.19.2',759:'1.19',758:'1.18.2',756:'1.17.1',754:'1.16.5',578:'1.15.2',498:'1.14.4',404:'1.13.2',340:'1.12.2',316:'1.11.2',210:'1.10.2',110:'1.9.4',47:'1.8.8' };
const KEEP = /^(explosion|named_sound_effect|spawn_entity|entity_metadata|collect|update_sign|entity_velocity|entity_status|disconnect|kick_disconnect|encryption_begin|success|compress|login_plugin_request|login_plugin_response|login_start|login_acknowledged|cookie_request|cookie_response|store_cookie|transfer|finish_configuration|keep_alive|ping|pong|registry_data|select_known_packs|add_resource_pack|remove_resource_pack|resource_pack_send|resource_pack_receive|login|chat|system_chat|player_chat|profileless_chat|disguised_chat|start_configuration|configuration_acknowledged|chat_message|chat_command|chat_command_signed|message_acknowledgement|chat_session_update|position|teleport_confirm|settings|custom_payload|ping_start|set_compression|update_health|respawn|update_time|spawn_position|map_chunk|map_chunk_bulk|multi_block_change|block_change|unload_chunk|named_entity_spawn|spawn_entity|spawn_entity_living|entity_destroy|rel_entity_move|entity_look|entity_move_look|entity_teleport|entity_head_rotation|position_look|look|flying|client_command|player_info|held_item_slot|set_slot|window_items|window_click|block_dig|block_place|arm_animation|game_state_change|transaction|use_entity|entity_action|abilities)$/;
const out = {};
for (const [p, v] of Object.entries(VERS)) {
  let d; try { d = mcdata(v); } catch (e) { console.log('skip', v, e.message); continue; }
  if (!d?.protocol) { console.log('no protocol data', v); continue; }
  const o = {};
  for (const st of ['login', 'configuration', 'play']) for (const dir of ['toClient', 'toServer']) {
    const t = d.protocol[st]?.[dir]?.types?.packet; if (!t) continue;
    const m = t[1][0].type[1].mappings; const r = {};
    for (const [id, n] of Object.entries(m)) if (KEEP.test(n)) r[n] = parseInt(id, 16);
    o[st[0] + (dir === 'toClient' ? 'c' : 's')] = r;   // lc ls cc cs pc ps
  }
  out[p] = o;
}
fs.mkdirSync('../../src/mc', { recursive: true });
fs.writeFileSync('../../src/mc/ids.json', JSON.stringify(out));
console.log(Object.keys(out).length, 'versions', fs.statSync('../../src/mc/ids.json').size, 'bytes');
console.log(JSON.stringify(out[47]), JSON.stringify(out[769].pc));
