<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->string('type'); // lost, found
            $table->string('category');
            $table->string('title');
            $table->text('description');
            $table->string('color')->nullable();
            $table->string('brand')->nullable();
            $table->json('photos')->nullable(); // stored as array of strings
            $table->dateTime('date');
            $table->string('address');
            $table->string('city')->nullable();
            $table->string('country')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->boolean('reward_offered')->default(false);
            $table->decimal('reward_amount', 12, 2)->default(0);
            $table->string('reward_currency')->default('XOF');
            $table->text('reward_description')->nullable();
            $table->string('status')->default('active'); // active, matched, pending_confirmation, closed, archived
            $table->boolean('is_moderated')->default(false);
            $table->string('moderation_status')->default('pending'); // pending, approved, rejected
            $table->text('moderation_note')->nullable();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->boolean('confirmed_by_user')->default(false);
            $table->boolean('confirmed_by_match')->default(false);
            $table->timestamp('archived_at')->nullable();
            $table->json('keywords')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};
