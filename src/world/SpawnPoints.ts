import * as THREE from 'three';
import { AirportZoneId } from '../game/GameConfig';
import { CollisionSystem } from '../systems/CollisionSystem';

export interface SpawnPoint {
  id: string;
  zone: AirportZoneId;
  position: THREE.Vector3;
}

export interface NavWaypoint {
  id: string;
  position: THREE.Vector3;
  neighbors: string[];
}

export const AIRPORT_SPAWN_POINTS: SpawnPoint[] = [
  // Zone A (Departure Terminal corners & side entrances)
  { id: 'sp_a1', zone: 'A', position: new THREE.Vector3(-20, 0, 30) },
  { id: 'sp_a2', zone: 'A', position: new THREE.Vector3(20, 0, 30) },
  // Zone B (Boarding Gate West)
  { id: 'sp_b1', zone: 'B', position: new THREE.Vector3(-44, 0, 21) },
  { id: 'sp_b2', zone: 'B', position: new THREE.Vector3(-44, 0, -4) },
  { id: 'sp_b3', zone: 'B', position: new THREE.Vector3(-30, 0, -6) },
  // Zone C (Baggage Claim East)
  { id: 'sp_c1', zone: 'C', position: new THREE.Vector3(44, 0, 21) },
  { id: 'sp_c2', zone: 'C', position: new THREE.Vector3(44, 0, -4) },
  { id: 'sp_c3', zone: 'C', position: new THREE.Vector3(30, 0, -6) },
  // Zone D (Corridor flanks)
  { id: 'sp_d1', zone: 'D', position: new THREE.Vector3(-18, 0, 0) },
  { id: 'sp_d2', zone: 'D', position: new THREE.Vector3(18, 0, 0) },
  // Zone E (Airport Apron)
  { id: 'sp_e1', zone: 'E', position: new THREE.Vector3(-42, 0, -44) },
  { id: 'sp_e2', zone: 'E', position: new THREE.Vector3(0, 0, -47) },
  { id: 'sp_e3', zone: 'E', position: new THREE.Vector3(42, 0, -44) },
  { id: 'sp_e4', zone: 'E', position: new THREE.Vector3(-28, 0, -24) },
  { id: 'sp_e5', zone: 'E', position: new THREE.Vector3(34, 0, -24) }
];

// Connected navigation graph through archways, doorways, and apron ramps
export const NAV_WAYPOINTS: NavWaypoint[] = [
  { id: 'wp_term_center', position: new THREE.Vector3(0, 0, 24), neighbors: ['wp_term_west', 'wp_term_east', 'wp_arch_w', 'wp_arch_e'] },
  { id: 'wp_term_west', position: new THREE.Vector3(-18, 0, 22), neighbors: ['wp_term_center', 'wp_gate_entry', 'wp_arch_w'] },
  { id: 'wp_term_east', position: new THREE.Vector3(18, 0, 22), neighbors: ['wp_term_center', 'wp_bag_entry', 'wp_arch_e'] },
  { id: 'wp_arch_w', position: new THREE.Vector3(-9, 0, 10), neighbors: ['wp_term_center', 'wp_term_west', 'wp_corr_w', 'wp_corr_center'] },
  { id: 'wp_arch_e', position: new THREE.Vector3(9, 0, 10), neighbors: ['wp_term_center', 'wp_term_east', 'wp_corr_e', 'wp_corr_center'] },
  { id: 'wp_corr_center', position: new THREE.Vector3(0, 0, 0), neighbors: ['wp_arch_w', 'wp_arch_e', 'wp_corr_w', 'wp_corr_e', 'wp_apron_mid'] },
  { id: 'wp_corr_w', position: new THREE.Vector3(-15, 0, 0), neighbors: ['wp_arch_w', 'wp_corr_center', 'wp_apron_w', 'wp_gate_n'] },
  { id: 'wp_corr_e', position: new THREE.Vector3(15, 0, 0), neighbors: ['wp_arch_e', 'wp_corr_center', 'wp_apron_e', 'wp_bag_n'] },
  { id: 'wp_gate_entry', position: new THREE.Vector3(-24, 0, 17), neighbors: ['wp_term_west', 'wp_gate_mid', 'wp_gate_s'] },
  { id: 'wp_gate_s', position: new THREE.Vector3(-38, 0, 20), neighbors: ['wp_gate_entry', 'wp_gate_mid'] },
  { id: 'wp_gate_mid', position: new THREE.Vector3(-36, 0, 6), neighbors: ['wp_gate_entry', 'wp_gate_s', 'wp_gate_n'] },
  { id: 'wp_gate_n', position: new THREE.Vector3(-34, 0, -5), neighbors: ['wp_gate_mid', 'wp_corr_w', 'wp_apron_w'] },
  { id: 'wp_bag_entry', position: new THREE.Vector3(24, 0, 17), neighbors: ['wp_term_east', 'wp_bag_mid', 'wp_bag_s'] },
  { id: 'wp_bag_s', position: new THREE.Vector3(38, 0, 20), neighbors: ['wp_bag_entry', 'wp_bag_mid'] },
  { id: 'wp_bag_mid', position: new THREE.Vector3(36, 0, 6), neighbors: ['wp_bag_entry', 'wp_bag_s', 'wp_bag_n'] },
  { id: 'wp_bag_n', position: new THREE.Vector3(34, 0, -5), neighbors: ['wp_bag_mid', 'wp_corr_e', 'wp_apron_e'] },
  { id: 'wp_apron_mid', position: new THREE.Vector3(0, 0, -15), neighbors: ['wp_corr_center', 'wp_apron_w', 'wp_apron_e', 'wp_tarmac_e', 'wp_tarmac_far'] },
  { id: 'wp_apron_w', position: new THREE.Vector3(-26, 0, -16), neighbors: ['wp_corr_w', 'wp_gate_n', 'wp_apron_mid', 'wp_tarmac_w'] },
  { id: 'wp_apron_e', position: new THREE.Vector3(26, 0, -16), neighbors: ['wp_corr_e', 'wp_bag_n', 'wp_apron_mid', 'wp_tarmac_e'] },
  { id: 'wp_tarmac_w', position: new THREE.Vector3(-38, 0, -34), neighbors: ['wp_apron_w', 'wp_tarmac_far'] },
  { id: 'wp_tarmac_e', position: new THREE.Vector3(32, 0, -34), neighbors: ['wp_apron_e', 'wp_apron_mid', 'wp_tarmac_far'] },
  { id: 'wp_tarmac_far', position: new THREE.Vector3(0, 0, -46), neighbors: ['wp_apron_mid', 'wp_tarmac_w', 'wp_tarmac_e'] }
];

const _toPlayer = new THREE.Vector3();

export function pickValidSpawnPoint(
  playerPos: THREE.Vector3,
  cameraForward: THREE.Vector3,
  collision: CollisionSystem
): THREE.Vector3 | null {
  const candidates: { point: THREE.Vector3; weight: number }[] = [];

  for (const sp of AIRPORT_SPAWN_POINTS) {
    const dist = sp.position.distanceTo(playerPos);
    if (dist < 14) continue; // Never spawn too close to player
    if (collision.isPointBlocked(sp.position.x, sp.position.z, 0.7)) continue;

    _toPlayer.subVectors(sp.position, playerPos).setY(0).normalize();
    const dot = _toPlayer.dot(cameraForward);
    // Avoid spawning directly in front of the player at medium distance
    if (dot > 0.72 && dist < 34) continue;

    // Prefer medium-far spawns (18-38m) behind or flanking the player
    const distScore = dist < 36 ? 1.5 : 0.8;
    const flankScore = dot < 0.2 ? 1.6 : 0.9;
    candidates.push({ point: sp.position, weight: distScore * flankScore });
  }

  if (candidates.length === 0) {
    // Fallback: pick farthest spawn point from player
    let best = AIRPORT_SPAWN_POINTS[0];
    let bestDist = -1;
    for (const sp of AIRPORT_SPAWN_POINTS) {
      const d = sp.position.distanceTo(playerPos);
      if (d > bestDist) {
        bestDist = d;
        best = sp;
      }
    }
    return best.position.clone();
  }

  const totalWeight = candidates.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * totalWeight;
  for (const c of candidates) {
    r -= c.weight;
    if (r <= 0) return c.point.clone();
  }
  return candidates[0].point.clone();
}

export function getAirportZoneAt(x: number, z: number): { id: string; name: string } {
  if (z < -12) return { id: 'E', name: 'Airport Apron' };
  if (x < -24) return { id: 'B', name: 'Boarding Gate' };
  if (x > 24) return { id: 'C', name: 'Baggage Claim' };
  if (z < 10) return { id: 'D', name: 'Airport Corridor' };
  return { id: 'A', name: 'Departure Terminal' };
}
