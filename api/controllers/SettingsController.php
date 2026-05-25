<?php
/**
 * SettingsController: per-seller configuration endpoints.
 * Currently exposes repeat-order cadences (Feature 4). Lightweight.
 */

declare(strict_types=1);

final class SettingsController
{
    public function show(): void
    {
        $userId = Auth::userId();
        Response::success(['settings' => UserSettings::get($userId)]);
    }

    public function update(): void
    {
        $userId = Auth::userId();
        $repeat = Request::input('repeat_days', []);
        if (!is_array($repeat)) { Response::error('repeat_days must be an object', 422); }

        try {
            $settings = UserSettings::update($userId, $repeat);
        } catch (InvalidArgumentException $e) {
            Response::error($e->getMessage(), 422);
        }

        Response::success(['settings' => $settings], 'Settings updated');
    }
}
