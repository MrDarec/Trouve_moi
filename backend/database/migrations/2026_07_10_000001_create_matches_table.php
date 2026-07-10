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
        Schema::create('matches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_lost_id')->constrained('items')->onDelete('cascade');
            $table->foreignId('item_found_id')->constrained('items')->onDelete('cascade');
            $table->foreignId('user_lost_id')->constrained('users')->onDelete('cascade');
            $table->foreignId('user_found_id')->constrained('users')->onDelete('cascade');
            $table->integer('score');
            $table->json('score_details')->nullable(); // category, keywords, distance, date scores
            $table->string('status')->default('pending'); // pending, accepted, rejected, closed
            $table->boolean('accepted_by_lost')->default(false);
            $table->boolean('accepted_by_found')->default(false);
            $table->foreignId('rejected_by_id')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('chat_enabled')->default(false);
            $table->boolean('restitution_confirmed_by_lost')->default(false);
            $table->boolean('restitution_confirmed_by_found')->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('matches');
    }
};
